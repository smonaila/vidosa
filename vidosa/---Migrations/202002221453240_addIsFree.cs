namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addIsFree : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Videos", "IsFree", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Videos", "IsFree");
        }
    }
}
