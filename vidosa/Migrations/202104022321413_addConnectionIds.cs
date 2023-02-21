namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addConnectionIds : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.ConnectionIds",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        ConnectionId = c.String(),
                        Email = c.String(),
                    })
                .PrimaryKey(t => t.Id);            
        }
        
        public override void Down()
        {
            DropTable("dbo.ConnectionIds");
        }
    }
}
