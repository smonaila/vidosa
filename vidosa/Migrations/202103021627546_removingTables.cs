namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class removingTables : DbMigration
    {
        public override void Up()
        {
            DropTable("dbo.OnlineUsers");
        }
        
        public override void Down()
        {
            CreateTable(
                "dbo.OnlineUsers",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Id_UserId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
    }
}
